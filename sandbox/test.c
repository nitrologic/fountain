// mips r3000 sratch pad
#define HEAPSTART 0x800c8000
#define HEAPSIZE  0x00130000
int *heap,*freelist,heapsize;
void initheap(void *m,int s){
	int i,*b;
	i=(int)m;
	s=s-(i&15);i=(i+15)&0xfffffff0;s=s&0xfffffff0;
	heap=(int *)i;
	heapsize=s;
	heap[0]=0;heap[1]=0;heap[2]=0;heap[3]=0;
	i=s>>2;
	heap[i-4]=-1;heap[i-3]=-1;heap[i-2]=-1;heap[i-1]=-1;
	s-=32;
	freelist=heap+4;
	b=freelist;
	b[0]=s;
	b[1]=0;			//owner
	b[2]=0;			//next
	b[(s>>2)-1]=s;
}
void *mallocmem(int size){
	int i,*a,*b,**p;
	if (size==0) return 0;
	size=(size+12+15)&0xfffffff0;
	p=&freelist;
	while (*p){
		a=*p;i=a[0];
		if (i==size) {*p=(int *)a[2];a[1]=-1;return a+2;}	//perfect fit
		if (i>size){		//split into two and insert smaller back in chain
			i-=size;a[0]=i;a[(i>>2)-1]=i;*p=(int *)a[2];
			p=&freelist;
			while (*p) {b=*p;if (i<b[0]) break;p=(int **)&b[2];}
			a[2]=(int)*p;*p=a;
			b=&a[i>>2];b[0]=size;b[1]=-1;b[(size>>2)-1]=size;
			return b+2;
		}
		p=(int **)&a[2];
	}
	return 0;
}

void freemem(void *m){
	int		i,*a,*b,*c,*d,**p;
// join adjacents
	a=(int *)m;a-=2;a[1]=0;d=0;
	if (a[-1]){
		b=a-(a[-1]>>2);
		if (b[1]==0){
			d=(int *)b[2];i=b[0]+a[0];a=b;a[0]=i;a[(i>>2)-1]=i;a[2]=0;
		}
	}
	b=a+(a[0]>>2);
	if (b[1]==0){
		i=a[0]+b[0];a[0]=i;a[(i>>2)-1]=i;
	}else{
		b=0;
	}
// relink
	p=&freelist;i=a[0];
	while (*p){
		c=*p;
		if (c==b) {*p=(int *)b[2];b=0;if (a==0) return;continue;}
		if (c==a) {*p=d;continue;}
		if (i<=c[0]){ //insert new block at correct location
			a[2]=(int)c;*p=a;i=0x7fffffff;a=0;if (b==0) return;
			continue;
		}
		p=(int **)&c[2];
	}
	*p=a;a[2]=0;
}
int avail(int t)		//-1=fucked   t!=0 returns largest
{
	int		i,j,t0,t1,l;
	int		*p;
	p=heap+4;t0=0;
	while (p){
		i=p[0];if (i==-1) break;
		if (p[(i>>2)-1]!=i) return -1;
		if (p[1]==0) t0+=i;
		p+=(i>>2);
	}
	p=freelist;t1=0;l=0;j=0;
	while (p){
		i=p[0];if (i<j) return -1;	//must be in order
		if (p[1]) return -1;
		if (p[(i>>2)-1]!=i) return -1;
		if (i>l) l=i;
		j=i;t1+=i;p=(int *)p[2];
	}
	if (t0!=t1) return -1;
	if (t) return l-12;
	if (t0) return t0-12;
	return 0;
}
void _start(void) {
	initheap((void *)HEAPSTART,HEAPSIZE);	//8008->801e
    volatile unsigned int *gpu = (unsigned int *)0x1F801810; // PS1 GPU register
    *gpu = 0x00000000; // Clear GPU status (example)
    while (1); // Infinite loop
}
